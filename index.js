import { HiAnime } from 'aniwatch';

const hianime = new HiAnime.Scraper();

hianime
  .getEpisodeSources('steinsgate-3?ep=230', 'hd-1', 'sub')
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
