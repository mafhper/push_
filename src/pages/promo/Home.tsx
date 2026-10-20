import { PromoDownload } from "@/components/promo/PromoDownload";
import { PromoHero } from "@/components/promo/PromoHero";
import { PromoInspector } from "@/components/promo/PromoInspector";
import { PromoRuntimes } from "@/components/promo/PromoRuntimes";
import { PromoScoring } from "@/components/promo/PromoScoring";

export default function HomePage() {
  return (
    <div className="bg-background">
      <PromoHero />
      <PromoScoring />
      <PromoInspector />
      <PromoRuntimes />
      <PromoDownload />
    </div>
  );
}
