export type ImageView = {
  id: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
  blurDataUrl: string;
  alt: string;
};

export type DocumentView = {
  id: string;
  url: string;
  name: string;
  bytes: number;
};
