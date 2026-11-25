import React from "react";
import { Clock, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function getReadTime(content) {
  if (!content) return "1 min read";
  const words = stripHtml(content).trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogCard({ item }) {
  const imgUrl =
    item?.thumbnail?.url || item?.image?.url || "/Image/blog-placeholder.webp";

  const dateStr = item.publishedAt || item.createdAt || item.date;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Thumbnail */}
      <div className="w-full overflow-hidden rounded-t-2xl">
        <img
          src={imgUrl}
          className="w-full h-36 object-cover"
          alt={item.title}
          loading="lazy"
          onError={(e) => {
            e.target.src = "/Image/blog-placeholder.webp";
          }}
        />
      </div>

      {/* Body */}
      {/*
        Key fix: use flex flex-col + flex-1 on the body,
        then push the button to the bottom with mt-auto on a wrapper.
        No absolute positioning needed — avoids content overlap.
      */}
      <div className="flex flex-col flex-1 p-5 pt-4">
        <div className="flex items-center justify-between text-[13px] font-medium text-gold mb-3">
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {item.readTime || getReadTime(item.content)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {formatDate(dateStr)}
          </span>
        </div>

        {/* Title */}
        <Link to={`/${item.slug}`}>
          <h3 className="font-bold text-[17px] leading-snug text-primary underline underline-offset-4 line-clamp-3 hover:opacity-80 transition-opacity cursor-pointer mb-3">
            {item.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-[13px] leading-relaxed text-gray-500 line-clamp-2 flex-1">
          {item.shortDescription || stripHtml(item.content)}
        </p>

        <div className="mt-auto -mx-5 -mb-5 pt-4">
          <Link
            to={`/${item.slug}`}
            className="group inline-flex items-center gap-2 bg-primary text-white pl-6 pr-2 py-1 rounded-r-3xl text-[14px] font-semibold transition-colors duration-200"
          >
            <span>Read More</span>
            <span className="h-full p-2 rounded-full group-hover:bg-gold transition-colors duration-700">
              <ArrowRight size={20} />
            </span>

            <span className="sr-only"> about {item.title}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
