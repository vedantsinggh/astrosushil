import { AlignRightIcon, ArrowRight, Clock } from "lucide-react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../../hooks/useCurrency";
function StarRating({ rating = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i < rating;
        return (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className="w-4 h-4"
            fill={filled ? "#d4af37" : "none"}
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="#d4af37" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M10 1.5l2.6 5.3 5.8.85-4.2 4.1 1 5.75L10 14.8l-5.2 2.7 1-5.75L1.6 7.65l5.8-.85z"
                  fill={`url(#half-${i})`}
                  stroke="#d4af37"
                  strokeWidth="1"
                />
              </>
            ) : (
              <path
                d="M10 1.5l2.6 5.3 5.8.85-4.2 4.1 1 5.75L10 14.8l-5.2 2.7 1-5.75L1.6 7.65l5.8-.85z"
                stroke="#d4af37"
                strokeWidth="1"
              />
            )}
          </svg>
        );
      })}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CourseCard({
  image,
  rating = 5,
  title = "Course Title",
  description = "",
  duration = "",
  originalPrice = 0,
  salePrice = 0,
  onBook,
  link,
}) {
  const navigate = useNavigate();
  const { convert } = useCurrency();
  console.log({
    salePrice,
    originalPrice,
    convertedSale: convert(salePrice),
  });
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#F4EEFF33] bg-white shadow-md transition-shadow duration-300 w-full  h-full">
      <div className="relative overflow-hidden aspect-video w-full bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full bg-primary/20 flex items-center justify-center">
            <span className="text-secondary text-sm">No image</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 flex-1 ">
        <StarRating rating={rating} />

        <div
          onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
          className="text-primary font-semibold text-base leading-snug line-clamp-2 cursor-pointer"
        >
          {title}
        </div>

        {description && (
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {description}
          </p>
        )}

        {duration && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock size={16} />
            <span>Duration : {duration} minutes</span>
          </div>
        )}

        {(originalPrice || salePrice) && (
          <div className="flex items-baseline gap-3 mt-auto pt-1">
            {Number(originalPrice) > 0 && (
              <span className="text-gray-400 text-sm line-through">
                {convert(Number(originalPrice))}
              </span>
            )}

            {Number(salePrice) > 0 && (
              <span className="text-black font-semibold text-base">
                {convert(Number(salePrice))}
              </span>
            )}
          </div>
        )}

        <span className="text-black/35 text-[10.5px] font-body">
          Exclusive of GST
        </span>
      </div>

      <button
        onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
        className="group w-1/2 cursor-pointer mt-2 flex items-center justify-between gap-2 rounded-r-full bg-primary pl-5 pr-2 py-2 text-sm font-semibold text-white tracking-wide active:scale-[0.98] transition-colors duration-700"
      >
        <span>Book Now</span>
        <span className="h-full p-2 rounded-full group-hover:bg-gold transition-colors duration-700">
          <ArrowRight size={20} />
        </span>
      </button>
    </div>
  );
}
