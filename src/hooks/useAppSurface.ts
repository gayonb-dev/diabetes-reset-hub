import { useEffect } from "react";

/**
 * Marks the document while a signed-in surface (member app or Admin) is
 * mounted. `src/index.css` uses `html[data-app-surface]` to switch heading
 * typography to the readable Inter stack, including dialogs that portal to
 * <body>, while leaving the public site and its checkout dialogs on the
 * brand serif.
 */
export function useAppSurface(surface: "member" | "admin") {
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-app-surface", surface);
    return () => {
      el.removeAttribute("data-app-surface");
    };
  }, [surface]);
}

export default useAppSurface;
