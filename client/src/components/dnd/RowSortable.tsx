import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  id: string;
  children: (opts: {
    setHandleProps: (elProps: any) => any;
    isDragging: boolean;
    style: React.CSSProperties;
    setNodeRef: (el: HTMLElement | null) => void;
  }) => React.ReactNode;
};

export default function RowSortable({ id, children }: Props) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const setHandleProps = (extra: any = {}) => ({
    ...attributes,
    ...listeners,
    ...extra,
  });

  return <>{children({ setHandleProps, isDragging, style, setNodeRef })}</>;
}
