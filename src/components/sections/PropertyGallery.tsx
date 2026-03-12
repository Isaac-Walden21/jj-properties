"use client";

import Image from "next/image";
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
              className={`relative overflow-hidden rounded-xl ${
                isFirst ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-square"
              } cursor-pointer transition-opacity hover:opacity-90`}
              aria-label={`View ${image.alt}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
              />
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

            {/* Active image */}
            <motion.div
              key={lightboxIndex}
              layoutId={`gallery-${propertyName}-${lightboxIndex}`}
              className="relative mx-16 aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[lightboxIndex].src}
                alt={images[lightboxIndex].alt}
                fill
                className="object-cover"
              />
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
