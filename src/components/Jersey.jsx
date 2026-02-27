// src/components/Jersey.jsx
import React from "react";

export default function Jersey({ primary, secondary, size = 18 }) {
  return (
    <svg
      viewBox="0 0 1152 896"
      width={size}
      height={(size * 896) / 1152}
      style={{ marginRight: 6, verticalAlign: "middle" }}
    >
      {/* LEFT SLEEVE */}
      <path
        d="M 285 309 L 116 415 L 44 225 L 45 221 L 277 60 L 408 61 L 439 81 L 295 306 Z"
        fill={secondary}
      />

      {/* RIGHT SLEEVE */}
      <path
        d="M 740 60 L 871 61 L 1093 216 L 1101 222 L 1101 226 L 1029 415 L 850 305 L 699 85 Z"
        fill={secondary}
      />

      {/* BODY */}
      <path
        d="M 569 866 L 338 865 L 295 306 L 439 81 L 485 101 L 533 112 L 569 115 
           L 583 115 L 625 110 L 666 99 L 699 85 L 806 864 L 773 866 Z"
        fill={primary}
      />
    </svg>
  );
}