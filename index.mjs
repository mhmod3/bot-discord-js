import { HiAnime } from "aniwatch";

const hianime = new HiAnime.Scraper();

(async () => {
  try {
    const data = await hianime.getInfo("steinsgate-3");
    console.log(data);
  } catch (error) {
    console.error("❌ Error fetching anime info:", error.message);
  }
})();
