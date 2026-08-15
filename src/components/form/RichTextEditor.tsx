import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { decodeHtmlEntities } from '../../utils/html';

const TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'clean'],
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 200,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <div
      className="rich-text-editor overflow-hidden rounded border bg-white dark:bg-gray-800"
      style={{ '--rte-min-height': `${minHeight}px` } as React.CSSProperties}
    >
      <ReactQuill
        theme="snow"
        value={decodeHtmlEntities(value)}
        onChange={onChange}
        placeholder={placeholder}
        modules={{ toolbar: TOOLBAR }}
      />
    </div>
  );
}