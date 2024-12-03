import { useState, useEffect } from "react";
import Image from "next/image";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import ArrowIcon from "./svg-icon/ArrowIcon";

export default function OpenGraphScraper() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [progress, setProgress] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [loading, setIsLoading] = useState(false);

  const scrapeOpenGraphData = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a valid website URL.");
      return;
    }

    setResults([]);
    setProgress(0);

    if (eventSource) {
      eventSource.close();
    }

    try {
      setIsLoading(true);
      const newEventSource = new EventSource(
        `/api/scrape?url=${encodeURIComponent(websiteUrl)}`
      );

      setEventSource(newEventSource);
      newEventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.progress !== undefined) {
          setProgress(data.progress);
        } else {
          setResults((prevResults) => [
            ...prevResults,
            {
              id: prevResults.length + 1,
              url: data.url,
              title: data.title,
              description: data.description,
              image: data.image,
            },
          ]);
        }
      };

      newEventSource.onerror = (error) => {
        console.error("Error with SSE connection:", error);
        toast.error("An error occurred while scraping.");
      };

      newEventSource.addEventListener("close", () => {
        toast.success("All data received.");
        newEventSource.close();
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const section = document.getElementById("sticky-section");
    const sectionOffsetTop = section.offsetTop;
    const handleScroll = () => {
      if (window.scrollY >= sectionOffsetTop) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setResults([]);
    setProgress(0);
  }, [websiteUrl]);

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const filteredResults = results?.filter(
    (result) =>
      result.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (result.title &&
        result.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (result.description &&
        result.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const scrollPercentageToShowButton = 0.2;

  useEffect(() => {
    const pageHeight = document.documentElement.scrollHeight;

    const scrollEventHandler = () => {
      if (window.pageYOffset > pageHeight * scrollPercentageToShowButton) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }
    };

    window.addEventListener("scroll", scrollEventHandler);

    return () => {
      window.removeEventListener("scroll", scrollEventHandler);
    };
  }, [scrollPercentageToShowButton]);

  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  console.log(loading,'loading')

  return (
    <div className="relative min-h-screen bg-gray-50 p-8">
      <ToastContainer />
      <h1
        id="header"
        className="text-3xl font-bold text-center text-gray-800 min-h-[100px]"
      >
        Open Graph Scraper
      </h1>

      {/* Sticky Section */}
      <div className="text-center gap-x-[50px] flex flex-wrap md:flex-nowrap justify-between mb-8">
        <div className="w-full md:w-[60%] lg:w-[70%] flex flex-wrap 1sm:flex-nowrap items-center">
          <input
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Enter website URL"
            className="w-full max-w-full md:max-w-[400px] px-[10px] py-[23px] border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={scrapeOpenGraphData}
            className="px-6 py-[13px] lg:py-[24px] bg-blue-600 text-white font-medium  hover:bg-blue-700 transition w-full 1sm:w-[250px]"
          >
            Scrape Open Graph Data
          </button>
        </div>
        <div className="text-center mt-[20px] md:mt-0 w-full md:w-[30%] lg:w-[20%] flex">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search table data..."
            className="w-full md:max-w-lg px-[10px] py-[24px] lg:p-3 border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
      {/* Progress Bar */}
      <div
        id="sticky-section"
        className={`${
          isSticky
            ? "fixed top-0 left-0 w-full bg-white z-10 shadow-md pb-[10px]"
            : "relative"
        }`}
      >
        <div className="w-full bg-gray-200 h-4">
          <div
            className={`bg-blue-600 h-4 transition-all duration-300 ease-in-out`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-center mt-2 text-sm">{progress}% Completed</p>
      </div>

      <div className={`overflow-auto mt-[10px] min-h-[1000px]`}>
        <table className="min-w-[1024px] lg:min-w-full w-full table-auto border-collapse border border-gray-200">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-4 py-2 border border-gray-200">ID</th>
              <th className="px-4 py-2 border border-gray-200">URL</th>
              <th className="px-4 py-2 border border-gray-200">OG Title</th>
              <th className="px-4 py-2 border border-gray-200">
                OG Description
              </th>
              <th className="px-4 py-2 border border-gray-200">OG Image</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : (
              <>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => (
                    <tr
                      key={result.id}
                      className="bg-white hover:bg-gray-100 transition"
                    >
                      <td className="px-4 py-2 border border-gray-200 text-center">
                        {result.id}
                      </td>
                      <td className="px-4 py-2 border border-gray-200">
                        <Link
                          href={result.url}
                          target="_blank"
                          className="flex underline text-blue-500"
                        >
                          {result.url}
                        </Link>
                      </td>
                      <td className="px-4 py-2 border border-gray-200">
                        {result.title}
                      </td>
                      <td className="px-4 py-2 border border-gray-200">
                        {result.description}
                      </td>
                      <td className="px-4 py-2 border border-gray-200">
                        {result.image && (
                          <Image
                            src={result.image}
                            alt="OG Image"
                            width={100}
                            height={100}
                            className="object-cover flex items-center justify-center"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      No results to display
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      {showButton && (
        <button
          onClick={scrollTop}
          className="fixed right-[20px] bottom-[20px] bg-blue-600 hover:opacity-80 w-[50px] h-[50px] flex items-center justify-center"
        >
          <div className="h-[20px] w-[10px] rotate-[267deg] text-white">
            <ArrowIcon />
          </div>
        </button>
      )}
    </div>
  );
}
