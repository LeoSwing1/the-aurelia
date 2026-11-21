import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reservation Status",
  path: "/reservation-status",
  noIndex: true,
  description: "Check the status of a reservation request at The Aurelia Hotel & Resort.",
});

export default function ReservationStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
