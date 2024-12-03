import Head from "next/head";
import OpenGraphScraper from "../components/OpenGraphScraper";

export default function Home() {
  return (
    <>
      <Head>
        <title>Open Graph Scraper</title>
        <meta name="description" content="Open Graph Scraper" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <OpenGraphScraper />
    </>
  );
}
