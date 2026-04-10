import { ResultPageView } from "@/components/result/ResultPageView";

type ResultPageProps = {
  params: {
    imageId: string;
  };
};

export default function ResultPage({ params }: ResultPageProps) {
  return <ResultPageView imageId={params.imageId} />;
}
