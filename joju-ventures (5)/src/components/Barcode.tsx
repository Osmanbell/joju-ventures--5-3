import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export default function Barcode({
  value,
  format = "CODE128",
  width = 1.4,
  height = 36,
  displayValue = true,
  fontSize = 10,
  className = ""
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 4,
          background: "transparent",
          lineColor: "#000000"
        });
      } catch (err) {
        console.error("Barcode rendering error:", err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={`max-w-full ${className}`} />;
}
