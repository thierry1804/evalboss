import { Reponse } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Tooltip } from './ui/Tooltip';
import { Textarea } from './ui/Textarea';
import { NOTE_LABELS } from '../types';
import { Sparkles } from 'lucide-react';

interface QuestionCardProps {
  reponse: Reponse;
  onNoteChange: (note: number) => void;
  onCommentaireChange: (commentaire: string) => void;
}

export function QuestionCard({ reponse, onNoteChange, onCommentaireChange }: QuestionCardProps) {
  const notes = [1, 2, 3, 4, 5];

  return (
    <Card className="mb-4">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex-1 pr-2">
          {reponse.question}
        </h3>
        {reponse.categorieIA && (
          <Badge variant="ia" className="flex items-center gap-1">
            <Sparkles size={14} />
            IA
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note (1 = Insuffisant, 5 = Excellent)
          </label>
          <div className="flex flex-wrap gap-2">
            {notes.map((note) => (
              <Tooltip key={note} content={NOTE_LABELS[note]} position="top">
                <button
                  type="button"
                  onClick={() => onNoteChange(note)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors
                    ${
                      reponse.noteCollaborateur === note
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {note}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <Textarea
          label="Commentaire (optionnel)"
          value={reponse.commentaireCollaborateur || ''}
          onChange={(e) => onCommentaireChange(e.target.value)}
          maxLength={500}
          showCharCount
          placeholder="Ajoutez un commentaire pour expliquer votre note..."
          rows={3}
        />
      </div>
    </Card>
  );
}

