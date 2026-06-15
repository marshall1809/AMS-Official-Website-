import { NextResponse, type NextRequest } from "next/server";
import { defaultCmsData } from "@/lib/cms/default-data";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname === "/" ? "/" : request.nextUrl.pathname.replace(/\/+$/, "");
  const redirect = defaultCmsData.redirects.find(
    (item) => item.isActive && item.sourcePath === path
  );

  if (redirect) {
    return NextResponse.redirect(new URL(redirect.destinationPath, request.url), redirect.statusCode);
  }

  const route = defaultCmsData.routes.find((item) => item.path === path);

  if (route?.status === "gone" || route?.targetType === "gone" || route?.statusCode === 410) {
    return new NextResponse("This page has been removed.", {
      status: 410,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-robots-tag": "noindex"
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|admin).*)"]
};
