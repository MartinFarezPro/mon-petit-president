import { Bareme } from "@/components/Bareme";
import { TopBar } from "@/components/TopBar";
import { getSession } from "@/lib/data";

export const metadata = { title: "Barème" };

export default async function Page() {
  const { profile } = await getSession();
  return (
    <main className="wrap">
      <TopBar profile={profile} />
      <Bareme />
    </main>
  );
}
