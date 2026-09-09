import { Toaster as Sonner } from "sonner";
import { useI18n } from "@/lib/i18n";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ position, ...props }: ToasterProps) => {
  const { isRtl } = useI18n();

  // Laptop & Mobile: top-right for Arabic (RTL), top-left for English (LTR)
  const resolvedPosition = position || (isRtl ? "top-right" : "top-left");

  return (
    <Sonner
      className="toaster group"
      position={resolvedPosition}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-sans",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
