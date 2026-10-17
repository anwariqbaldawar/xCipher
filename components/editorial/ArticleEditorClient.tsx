"use client";

import dynamic from "next/dynamic";
import React from "react";
import type ArticleEditorComponent from "./ArticleEditor";
import BrandLoader from "@/components/common/BrandLoader";

const ArticleEditor = dynamic(() => import("./ArticleEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <BrandLoader status="LOADING STORY CANVAS…" mode="inline" />
    </div>
  ),
});

export default function ArticleEditorClient(
  props: React.ComponentProps<typeof ArticleEditorComponent>
) {
  return <ArticleEditor {...props} />;
}
