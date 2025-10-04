import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Lock, 
  Check, 
  X,
  AlertTriangle
} from "lucide-react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { toast } from "sonner";

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageCategoriesDialog = ({
  open,
  onOpenChange,
}: ManageCategoriesDialogProps) => {
  const { 
    categories, 
    fetchCategories, 
    getCategoriesByType,
    addCategory, 
    updateCategory, 
    deleteCategory 
  } = useTransactionsStore();

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, fetchCategories]);

  const expenseCategories = getCategoriesByType('expense');
  const incomeCategories = getCategoriesByType('income');
  
  const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;
  const systemCategories = currentCategories.filter(cat => cat.is_default);
  const customCategories = currentCategories.filter(cat => !cat.is_default);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await addCategory(newCategoryName.trim(), activeTab);
      setNewCategoryName("");
      setIsAdding(false);
      toast.success(`${activeTab} category added successfully!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await updateCategory(id, editingName.trim());
      setEditingId(null);
      setEditingName("");
      toast.success("Category updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Any transactions using this category will be moved to "Others".`)) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteCategory(id);
      toast.success("Category deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewCategoryName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Categories
          </DialogTitle>
          <DialogDescription>
            Organize your transaction categories. System categories cannot be edited or deleted.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'expense' | 'income')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">💸 Expense ({expenseCategories.length})</TabsTrigger>
            <TabsTrigger value="income">💰 Income ({incomeCategories.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* System Categories */}
            {systemCategories.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground">System Categories</h4>
                </div>
                <div className="space-y-1">
                  {systemCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Custom Categories</h4>
                {!isAdding && (
                  <Button
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Category
                  </Button>
                )}
              </div>

              {/* Add New Category Form */}
              {isAdding && (
                <div className="p-3 border rounded-lg bg-background">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="newCategory">Category Name</Label>
                      <Input
                        id="newCategory"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={`Enter ${activeTab} category name`}
                        maxLength={50}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCategory();
                          if (e.key === 'Escape') cancelAdding();
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {newCategoryName.length}/50 characters
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddCategory}
                        disabled={isLoading || !newCategoryName.trim()}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelAdding}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Categories List */}
              <div className="space-y-1">
                {customCategories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground bg-secondary/20 rounded-lg">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No custom {activeTab} categories yet</p>
                    <p className="text-xs">Add one to get started</p>
                  </div>
                ) : (
                  customCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {editingId === category.id ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              maxLength={50}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditCategory(category.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditCategory(category.id)}
                                disabled={isLoading || !editingName.trim()}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={isLoading}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium">{category.name}</span>
                            <Badge variant="outline" className="text-xs">Custom</Badge>
                          </>
                        )}
                      </div>

                      {editingId !== category.id && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(category.id, category.name)}
                            disabled={isLoading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                            disabled={isLoading}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {systemCategories.length > 0 && customCategories.length > 0 && (
              <Separator className="my-4" />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
