import React, { HTMLProps } from "react";

export interface Props extends HTMLProps<HTMLImageElement> {
  height?: number;
}

export default function UpstashLogo({ height = 20, ...props }: Props) {
  return (
    <img src="/despierta.png" height={height} alt="Upstash Logo" {...props} />
  );
}
