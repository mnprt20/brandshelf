import React, { useEffect, useRef } from "react";
import { Category } from "../../types";

interface CategoryChipsProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  brandColor?: string;
  isSearchingOrFiltering?: boolean;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  brandColor = "#1B3B2B",
  isSearchingOrFiltering = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Hidden while searching or filtering
  if (isSearchingOrFiltering) {
    return null;
  }

  // Set up IntersectionObserver to highlight active category on scroll
  useEffect(() => {
    if (categories.length === 0) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      // Find the first visible category section
      const visible = entries.find(e => e.isIntersecting);
      if (visible) {
        const catId = visible.target.getAttribute("data-category-id") || visible.target.id.replace("cat-", "");
        if (catId) {
          onSelectCategory(catId);
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-90px 0px -60% 0px",
      threshold: 0
    });

    categories.forEach(c => {
      const el = document.getElementById(`cat-${c.id}`) || document.querySelector(`[data-category-id="${c.id}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories, onSelectCategory]);

  const handleChipClick = (id: string | null) => {
    onSelectCategory(id);
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const target = document.getElementById(`cat-${id}`) || document.querySelector(`[data-category-id="${id}"]`);
    if (target) {
      const stickyOffset = 90;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - stickyOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #E5EADF",
        padding: "10px 16px",
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch"
      }}
    >
      <button
        type="button"
        onClick={() => handleChipClick(null)}
        style={{
          padding: "7px 16px",
          borderRadius: "9999px",
          background: activeCategoryId === null ? brandColor : "#F0F4EC",
          color: activeCategoryId === null ? "#FFFFFF" : "#1C241B",
          border: `1px solid ${activeCategoryId === null ? brandColor : "#DCE3D6"}`,
          fontWeight: 600,
          fontSize: "13px",
          whiteSpace: "nowrap",
          cursor: "pointer",
          transition: "all 0.15s ease",
          flexShrink: 0
        }}
      >
        All
      </button>

      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleChipClick(cat.id)}
            style={{
              padding: "7px 16px",
              borderRadius: "9999px",
              background: isActive ? brandColor : "#F0F4EC",
              color: isActive ? "#FFFFFF" : "#1C241B",
              border: `1px solid ${isActive ? brandColor : "#DCE3D6"}`,
              fontWeight: 600,
              fontSize: "13px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};
