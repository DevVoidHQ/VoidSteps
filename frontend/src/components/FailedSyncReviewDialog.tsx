import { useState, useEffect } from 'react';
import { ListTodo, Target, Zap, Network, Settings, RefreshCw, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { useFailedSyncItems, type FailedSyncItem } from '@/hooks/useFailedSyncItems';
import { retryFailedEntry, discardFailedEntry, retryAllFailed, discardAllFailed } from '@/lib/sync-queue-actions';

const entityIcons: Record<string, LucideIcon> = {
  steps: ListTodo,
  paths: Target,
  routines: Zap,
  pathways: Network,
  userSettings: Settings,
};

const operationBadgeVariant: Record<string, 'info' | 'warning' | 'destructive'> = {
  create: 'info',
  update: 'warning',
  delete: 'destructive',
};

interface FailedSyncReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FailedSyncItemRow({ item }: { item: FailedSyncItem }) {
  const toast = useToast();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const Icon = entityIcons[item.entityType] || ListTodo;

  const handleRetry = async () => {
    await retryFailedEntry(item.queueEntryId);
    toast.info(`Retrying sync for "${item.entityName}"`);
  };

  const handleDiscard = async () => {
    await discardFailedEntry(item.queueEntryId);
    toast.info(`Discarded "${item.entityName}"`);
  };

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50">
        <div className="mt-0.5 shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{item.entityName}</span>
            <Badge variant={operationBadgeVariant[item.operation]} size="sm">
              {item.operation}
            </Badge>
          </div>
          {item.lastError && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.lastError}
            </p>
          )}
          {!item.lastError && (
            <p className="text-xs text-muted-foreground mt-1">
              Failed after {item.retryCount} retries
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={handleRetry} title="Retry">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDiscard(true)} title="Discard" className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this change?"
        description={`"${item.entityName}" (${item.operation}) will be permanently discarded and won't sync to the server.`}
        confirmLabel="Discard"
        onConfirm={handleDiscard}
      />
    </>
  );
}

export default function FailedSyncReviewDialog({ open, onOpenChange }: FailedSyncReviewDialogProps) {
  const items = useFailedSyncItems();
  const toast = useToast();
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);

  // Auto-close when all items are resolved
  useEffect(() => {
    if (open && items.length === 0) {
      onOpenChange(false);
    }
  }, [items.length, open, onOpenChange]);

  const handleRetryAll = async () => {
    await retryAllFailed();
    toast.info(`Retrying ${items.length} failed item${items.length !== 1 ? 's' : ''}`);
  };

  const handleDiscardAll = async () => {
    await discardAllFailed();
    toast.info('All failed items discarded');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Failed Sync Items</DialogTitle>
            <DialogDescription>
              {items.length} item{items.length !== 1 ? 's' : ''} failed to sync to the server.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto space-y-2 scrollbar-hide">
            {items.map((item) => (
              <FailedSyncItemRow key={item.queueEntryId} item={item} />
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {items.length > 1 && (
              <>
                <Button variant="outline" onClick={handleRetryAll}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry All
                </Button>
                <Button variant="destructive" onClick={() => setConfirmDiscardAll(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard All
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscardAll}
        onOpenChange={setConfirmDiscardAll}
        title="Discard all failed items?"
        description={`${items.length} item${items.length !== 1 ? 's' : ''} will be permanently discarded and won't sync to the server.`}
        confirmLabel="Discard All"
        onConfirm={handleDiscardAll}
      />
    </>
  );
}
