/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, ImageIcon } from "lucide-react";

import Pagination from "../../components/Pagination";
import { useDownloadStore } from "../../store/useDownloadStore";

const ITEMS_PER_PAGE = 8;

function DownloadCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="bg-white rounded-2xl border border-black/8 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="relative w-full h-50 bg-secondary/10 overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-primary/20" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="font-heading font-bold text-primary text-sm leading-snug line-clamp-2">
            {item.productName}
          </p>

          <p className="text-xs font-body text-black/40 mt-0.5">
            Digital Product
          </p>
        </div>

        <motion.a
          href={item.file}
          target="_blank"
          rel="noreferrer"
          download
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white text-sm font-body font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </motion.a>
      </div>
    </motion.div>
  );
}

export default function DownloadsSection() {
  const [page, setPage] = useState(1);

  const {
    downloads,
    loading,
    getDownloads,
  } = useDownloadStore();

  useEffect(() => {
    getDownloads();
  }, []);

  const totalPages = Math.ceil(downloads.length / ITEMS_PER_PAGE);

  const paginated = downloads.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handlePageChange = (p) => {
    setPage(p);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 text-sm text-center">
        Loading...
      </div>
    );
  }

  return (
    <section className="min-h-screen">
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Download className="w-7 h-7 text-primary/40" />
          </div>

          <p className="font-heading font-bold text-primary text-lg mb-1">
            No downloads yet
          </p>

          <p className="text-sm font-body text-black/40">
            Your purchased digital products will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {paginated.map((item, i) => (
              <DownloadCard
                key={item._id || i}
                item={item}
                index={i}
              />
            ))}
          </div>

          <Pagination
            current={page}
            total={totalPages}
            onChange={handlePageChange}
          />
        </>
      )}
    </section>
  );
}