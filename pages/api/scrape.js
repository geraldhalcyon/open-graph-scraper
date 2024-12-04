import chromium from "@sparticuz/chromium-min";
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  let puppeteer;
  if (process.env.NODE_ENV === "production") {
    puppeteer = await import("puppeteer-core");
  } else {
    puppeteer = await import("puppeteer");
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let sitemapUrl = `${url}/sitemap-0.xml`;

  const fetchSitemap = async (sitemapUrl) => {
    try {
      const response = await axios.get(sitemapUrl);
      if (response.status !== 200) {
        console.log(`Received status ${response.status} for ${sitemapUrl}`);
        return null;
      }
      return response.data;
    } catch (error) {
      console.log(`Failed to fetch ${sitemapUrl}: ${error.message}`);
      return null;
    }
  };

  let sitemapData = await fetchSitemap(sitemapUrl);
  if (!sitemapData) {
    console.log(`Trying fallback to ${url}/sitemap.xml`);
    sitemapUrl = `${url}/sitemap.xml`;
    sitemapData = await fetchSitemap(sitemapUrl);
  }

  if (!sitemapData) {
    return res.status(404).json({ error: "Sitemap not found" });
  }

  try {
    const response = await axios.get(sitemapUrl);
    const sitemapXml = response.data;

    const parser = new xml2js.Parser();
    const parsedXml = await parser.parseStringPromise(sitemapXml);
    const urls = parsedXml.urlset.url.map((entry) => entry.loc[0]);

    if (urls.length === 0) {
      return res.status(400).json({ error: "No URLs found in the sitemap" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // const chromiumPack =
    //   "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

    const browser =
      process.env.NODE_ENV === "production"
        ? await puppeteer.launch({
            // args: chromium.args,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
            ],
            executablePath: await chromium.executablePath(),
            headless: true,
          })
        : await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
          });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.resourceType() === "image") {
        request.abort();
      } else {
        request.continue();
      }
    });

    const retryGoto = async (page, url, retries = 3, timeout = 30000) => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await page.goto(url, { waitUntil: "networkidle0", timeout });
          return true;
        } catch (error) {
          if (attempt === retries - 1) {
            throw error;
          }
          console.log(`Retrying ${url} (attempt ${attempt + 1})`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    };

    const totalUrls = urls.length;
    let processedUrls = 0;

    for (const siteUrl of urls) {
      try {
        await retryGoto(page, siteUrl);

        await page.waitForSelector('meta[property="og:image"]', {
          timeout: 30000,
        });

        const ogData = await page.evaluate(() => {
          const getMetaContent = (property) => {
            const element =
              document.querySelector(`meta[property="${property}"]`) ||
              document.querySelector(`meta[name="${property}"]`);

            return element ? element.content : "N/A";
          };

          return {
            title: getMetaContent("og:title"),
            description: getMetaContent("og:description"),
            image: getMetaContent("og:image"),
          };
        });

        const imageUrl = ogData.image;
        const eventData = {
          url: siteUrl,
          title: ogData.title,
          description: ogData.description,
          image: imageUrl !== "N/A" ? imageUrl : null,
        };

        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        res.flush();

        processedUrls++;
        const progress = Math.round((processedUrls / totalUrls) * 100);

        res.write(`data: { "progress": ${progress} }\n\n`);
        res.flush();
      } catch (error) {
        console.error(`Error scraping ${siteUrl}:`, error.message);
        res.write(
          `data: ${JSON.stringify({
            url: siteUrl,
            error: "Failed to fetch OG data",
          })}\n\n`
        );
        res.flush();
      }
    }

    await browser.close();

    res.write("event: close\ndata: done\n\n");
    res.end();
  } catch (error) {
    console.error("Error fetching or parsing the sitemap:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
}
