import("aniwatch")
  .then((aniwatch) => {
    console.log(aniwatch);  // طباعة الكائن بالكامل لمعرفة ما يتم تصديره
    const { HiAnime } = aniwatch;
    if (HiAnime) {
      const hianime = new HiAnime.Scraper();

      hianime
        .getEpisodeSources("steinsgate-3?ep=230", "hd-1", "sub")
        .then((data) => console.log(data))
        .catch((err) => console.error(err));
    } else {
      console.error("HiAnime is not available in the aniwatch module.");
    }
  })
  .catch((err) => console.error("Error loading aniwatch:", err));
