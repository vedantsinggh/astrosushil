import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import Pagination from "../../components/Pagination";
import useReportStore from "@/store/useReportStore";

const ITEMS_PER_PAGE = 8;

function PdfIcon() {
  return (
    <div className="relative w-16 h-20 mx-auto mb-4">
      <div className="w-full h-full bg-white border-2 border-secondary/80 rounded-md flex flex-col items-center justify-center gap-1 pt-4">
        <div className="w-8 h-1 bg-secondary/80 rounded-full" />
        <div className="w-8 h-1 bg-secondary/80 rounded-full" />
        <div className="w-8 h-1 bg-secondary/80 rounded-full" />
        <div className="w-5 h-1 bg-secondary/80 rounded-full" />
      </div>

      <div className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm leading-none">
        PDF
      </div>
    </div>
  );
}

function ReportCard({ report, index, onDownloadInvoice, downloading }) {
  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed p-5 flex flex-col items-center text-center border-primary/30 hover:shadow-md transition-all duration-200"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <PdfIcon />

      <p className="font-heading font-bold text-primary text-sm mb-4 leading-snug">
        {report.reportId?.name || "Astrology Report"}
      </p>

      <div className="grid grid-cols-1 gap-2 w-full">
        <a
          href={report.reportUrl}
          download
          className="flex items-center justify-center gap-1.5 py-2 bg-primary text-white text-xs font-body font-medium rounded-lg hover:bg-gold transition-colors duration-700"
        >
          Download PDF
        </a>
        <a
          href={report.reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 bg-primary text-white text-xs font-body font-medium rounded-lg hover:bg-gold transition-colors duration-700"
        >
          View PDF
        </a>
        <button
          onClick={() => onDownloadInvoice(report._id)}
          disabled={downloading}
          className="flex items-center justify-center cursor-pointer gap-1.5 py-2 bg-primary text-white text-xs font-body font-medium rounded-lg hover:bg-gold transition-colors duration-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading ? "Downloading..." : "Download Invoice"}
        </button>
      </div>
    </div>
  );
}

export default function MyReportsSection() {
  const [reportOrders, setReportOrders] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const { getReportOrders, downloadReportInvoice } = useReportStore();

  useEffect(() => {
    const fetchReportOrders = async () => {
      const reports = await getReportOrders();
      setReportOrders(reports.data);
    };
    fetchReportOrders();
  }, []);

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingId(orderId);
      await downloadReportInvoice(orderId);
    } finally {
      setDownloadingId(null);
    }
  };

  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(reportOrders.length / ITEMS_PER_PAGE);
  const paginated = reportOrders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="min-h-screen">
      <div className="p-6">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-primary/40" />
            </div>
            <p className="font-heading font-bold text-primary text-lg mb-1">
              No reports yet
            </p>
            <p className="text-sm font-body text-black/40">
              Your purchased reports will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {paginated.map((report, i) => (
                <ReportCard
                  key={report._id || i}
                  report={report}
                  index={i}
                  onDownloadInvoice={handleDownloadInvoice}
                  downloading={downloadingId === report._id}
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
      </div>
    </section>
  );
}
