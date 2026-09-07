import { staticFile } from 'remotion';

export const Fonts = () => (
  <style>{`
    @font-face { font-family: 'Geist'; src: url(${staticFile('fonts/Geist.woff2')}) format('woff2'); font-weight: 400 700; font-display: block; }
    @font-face { font-family: 'Geist Mono'; src: url(${staticFile('fonts/GeistMono.woff2')}) format('woff2'); font-weight: 400 600; font-display: block; }
    * { box-sizing: border-box; }
  `}</style>
);
