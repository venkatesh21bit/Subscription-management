import { PropsWithChildren } from "react";

export default function authentication({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-black">
      {children}
    </div>
  );
}
