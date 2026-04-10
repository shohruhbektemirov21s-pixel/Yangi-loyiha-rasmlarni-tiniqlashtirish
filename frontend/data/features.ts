export type FeatureItem = {
  title: string;
  description: string;
  icon: "spark" | "text" | "scan";
};

export const FEATURES: FeatureItem[] = [
  {
    title: "Blur Removal",
    description:
      "Apply practical enhancement steps to recover clearer edges and details from soft or blurry images.",
    icon: "spark"
  },
  {
    title: "Text Readability Improvement",
    description:
      "Improve contrast and local sharpness so text in photos, screenshots, and documents is easier to read.",
    icon: "text"
  },
  {
    title: "OCR Text Extraction",
    description:
      "Extract machine-readable text from enhanced images to support search, copy, and downstream workflows.",
    icon: "scan"
  }
];
