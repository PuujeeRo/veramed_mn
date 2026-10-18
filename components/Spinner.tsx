import { FiLoader } from "react-icons/fi";

interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className = "h-5 w-5 text-brand-600" }: SpinnerProps) {
  return <FiLoader className={`animate-spin ${className}`} aria-label="Loading" />;
}
