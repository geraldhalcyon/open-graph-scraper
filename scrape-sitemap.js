import puppeteer from "puppeteer";
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
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

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

 
    res.setHeader("Content-Type", "application/json");
    res.write('{"results":['); 

    let firstItemSent = false;


    for (const siteUrl of urls) {
      try {
        await page.goto(siteUrl, { waitUntil: "domcontentloaded" });

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

        const result = { url: siteUrl, ...ogData };

        if (!firstItemSent) {
          res.write(JSON.stringify(result)); 
          firstItemSent = true;
        } else {
          res.write("," + JSON.stringify(result)); 
        }
      } catch (error) {
        console.error(`Error scraping ${siteUrl}:`, error.message);
        const errorResult = { url: siteUrl, error: "Failed to fetch OG data" };

        if (!firstItemSent) {
          res.write(JSON.stringify(errorResult)); 
          firstItemSent = true;
        } else {
          res.write("," + JSON.stringify(errorResult)); 
        }
      }
    }

    await browser.close();

    res.write("]}"); 
    res.end();
  } catch (error) {
    console.error("Error fetching or parsing the sitemap:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
}
