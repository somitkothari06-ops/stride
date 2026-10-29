"use client";
import { FileText, Image as ImageIcon, ArrowRight } from 'lucide-react';

type Props = {
  format?: string;
  sample?: boolean;
  hasOriginal?: boolean;
  visualsAvailable?: boolean;
  checked: boolean;
  busy: boolean;
  onChange: (checked: boolean) => void;
};

export default function StudyReadingMode(props: Props) {
  if (props.visualsAvailable) {
    return <label className="study-visual-toggle">
      <input type="checkbox" checked={props.checked} disabled={props.busy}
        onChange={event => props.onChange(event.target.checked)} />
      <span>Include diagrams & images</span>
    </label>;
  }
  const needsConnection = !!props.hasOriginal;
  const title = needsConnection ? 'Image reading needs setup'
    : props.sample ? 'Text-only sample'
    : props.format === 'pptx' ? 'Slide text' : 'Text document';
  const message = needsConnection ? 'You can still study the text while image reading is disconnected.'
    : props.sample ? 'This example has no images. Try your own PDF to study diagrams too.'
    : props.format === 'pptx' ? 'For diagrams, export these slides as a PDF and upload it.'
    : 'Upload a PDF to include its diagrams and images.';
  const Icon = needsConnection ? ImageIcon : FileText;
  return <div className="study-reading-mode">
    <div><Icon size={19} aria-hidden="true"/><strong>{title}</strong></div>
    <p>{message}</p>
    <a className="study-mode-link" href={needsConnection ? '/workspace?open=integrations' : '/workspace?open=course'}>
      {needsConnection ? 'Open connections' : 'Upload a PDF'}<ArrowRight size={16}/>
    </a>
  </div>;
}
