import Link from "next/link";

export function DevelopedBy() {
  return (
    <div className="flex flex-col">
      <span className="text-gray-300/50 text-xs leading-none">
        Developed by
      </span>
      <Link href="https://www.theabhipatel.com/" target="_theabhipatel">
        <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-lg leading-none font-semibold tracking-wide text-transparent">
          TheAbhiPatel
        </span>
      </Link>
    </div>
  );
}
