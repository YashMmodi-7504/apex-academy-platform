import React from 'react';
import {
  FileText,
  Code2,
  Database,
  ExternalLink,
  Download,
  Paperclip,
  BookOpen,
} from 'lucide-react';

interface ResourceItem {
  id: string;
  title: string;
  resource_type: string;
  file_url: string;
}

interface LessonResourcesProps {
  resources: ResourceItem[];
}

const ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  PDF: { icon: FileText, className: 'text-red-500' },
  CODE: { icon: Code2, className: 'text-indigo-500' },
  DATASET: { icon: Database, className: 'text-emerald-500' },
  NOTE: { icon: BookOpen, className: 'text-amber-500' },
  LINK: { icon: ExternalLink, className: 'text-blue-500' },
};

export const LessonResources: React.FC<LessonResourcesProps> = ({ resources }) => {
  if (!resources || resources.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 shrink-0 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-900">
          Resources
          <span className="ml-1.5 font-semibold text-slate-500">({resources.length})</span>
        </h3>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {resources.map((res) => {
          const type = (res.resource_type || '').toUpperCase();
          const meta = ICONS[type] || { icon: Paperclip, className: 'text-slate-500' };
          const Icon = meta.icon;
          const isLink = type === 'LINK';
          // A link opens; everything else is a file the learner takes away.
          const ActionIcon = isLink ? ExternalLink : Download;

          return (
            <a
              key={res.id}
              href={res.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-indigo-300 hover:shadow-xs"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${meta.className}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-slate-800 transition-colors group-hover:text-indigo-600">
                    {res.title}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {isLink ? 'External link' : type || 'File'}
                  </span>
                </span>
              </span>

              <span
                aria-hidden="true"
                className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600"
              >
                <ActionIcon className="h-3.5 w-3.5" />
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
};
