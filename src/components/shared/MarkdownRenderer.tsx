import Markdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose-stream text-sm ${className}`}>
      <Markdown>{content}</Markdown>
    </div>
  );
}
