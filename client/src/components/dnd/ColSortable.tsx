import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  id: string;
  children: (opts: {
    setNodeRef: (node: HTMLElement | null) => void;
    setHandleProps: (props: any) => any;
    style: React.CSSProperties;
  }) => React.ReactNode;
};

export default function ColSortable({ id, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
    willChange: "transform",
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.9 : 1,
    cursor: "grab",
  };

  const setHandleProps = (extra?: any) => ({
    ...attributes,
    ...listeners,
    ...extra,
  });

  return <>{children({ setNodeRef, setHandleProps, style })}</>;
}
