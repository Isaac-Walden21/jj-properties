"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PropertyImage } from "@/types";

interface PropertyGalleryProps {
  images: PropertyImage[];
  propertyName: string;
}

const placeholderGradients = [
  "from-pine via-timber to-lake",
  "from-timber via-ink to-pine",
  "from-lake via-pine to-timber",
  "from-ink via-lake to-pine",
  "from-timber via-pine to-ink",
  "from-pine via-lake to-ink",
];

export function PropertyGallery({
  images,
  propertyName,
}: PropertyGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  }, [lightboxIndex, images.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  }, [lightboxIndex, images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, goNext, goPrev]);

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {images.map((image, index) => {
          const gradient =
            placeholderGradients[index % placeholderGradients.length];
          const isFirst = index === 0;

          return (
            <motion.button
              key={image.src}
              layoutId={`gallery-${propertyName}-${index}`}
              onClick={() => openLightbox(index)}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} ${
                isFirst ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-square"
              } cursor-pointer transition-opacity hover:opacity-90`}
              aria-label={`View ${image.alt}`}
            >
              <div className="absolute inset-0 bg-ink/10" />
              <span className="absolute bottom-3 left-3 text-xs text-cream/70">
                {image.alt}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute right-5 top-5 z-50 rounded-full bg-cream/10 p-2 text-cream transition-colors hover:bg-cream/20"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Previous button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-5 z-50 rounded-full bg-cream/10 p-2 text-cream transition-colors hover:bg-cream/20"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Active image placeholder */}
            <motion.div
              key={lightboxIndex}
              layoutId={`gallery-${propertyName}-${lightboxIndex}`}
              className={`mx-16 aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-br ${
                placeholderGradients[
                  lightboxIndex % placeholderGradients.length
                ]
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-cream/60">
                  {images[lightboxIndex].alt}
                </p>
              </div>
            </motion.div>

            {/* Next button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-5 z-50 rounded-full bg-cream/10 p-2 text-cream transition-colors hover:bg-cream/20"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Image counter */}
            <span className="absolute bottom-5 text-sm text-cream/60">
              {lightboxIndex + 1} / {images.length}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
