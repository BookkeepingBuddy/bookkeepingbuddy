import { useState } from 'react';
import { Database, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StorageItem {
  key: string;
  size: string;
  preview: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getStorageItems(): StorageItem[] {
  const items: StorageItem[] = [];

  // Get all localStorage keys that belong to our app
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('finance-')) {
      const value = localStorage.getItem(key);
      if (value) {
        const size = new Blob([value]).size;
        let preview = '';
        try {
          const parsed = JSON.parse(value);
          if (key === 'finance-config') {
            preview = `${parsed.rules?.length || 0} rules`;
          } else if (key.startsWith('finance-file-')) {
            preview = `${parsed.name || 'Unknown'} - ${parsed.parsedRows?.length || 0} rows`;
          }
        } catch {
          preview = 'Invalid JSON';
        }
        items.push({ key, size: formatBytes(size), preview });
      }
    }
  }

  return items.sort((a, b) => a.key.localeCompare(b.key));
}

export function StorageManager() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [open, setOpen] = useState(false);

  const refreshItems = () => {
    setItems(getStorageItems());
  };

  const handleDelete = (key: string) => {
    localStorage.removeItem(key);
    refreshItems();
    toast.success(`Deleted ${key}`);
  };

  const handleDeleteAll = () => {
    // Get all finance-* keys and delete them
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('finance-')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
    refreshItems();
    toast.success('All app data cleared');
  };

  const totalSize = items.reduce((acc, item) => {
    const value = localStorage.getItem(item.key);
    return acc + (value ? new Blob([value]).size : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) refreshItems(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Database className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Local Storage</DialogTitle>
          <DialogDescription>
            Manage data stored in your browser. Total: {formatBytes(totalSize)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No app data stored
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.key}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} • {item.preview}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(item.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All App Data
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
