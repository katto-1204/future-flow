import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  FileText,
  Video,
  Link2,
  FileSpreadsheet,
  Download,
  ExternalLink,
  BookOpen,
  Code2,
  Network,
  Database,
  Cpu,
  Filter,
  Grid,
  List,
} from "lucide-react";
import type { Resource } from "@shared/schema";

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  video: Video,
  article: Link2,
  template: FileSpreadsheet,
  default: BookOpen,
};

const categoryIcons: Record<string, React.ElementType> = {
  programming: Code2,
  networking: Network,
  data: Database,
  hardware: Cpu,
  career: BookOpen,
  default: BookOpen,
};

const categories = [
  { id: "all", label: "All Resources" },
  { id: "programming", label: "Programming" },
  { id: "networking", label: "Networking" },
  { id: "vlsi", label: "VLSI & Hardware" },
  { id: "career", label: "Career Guides" },
  { id: "templates", label: "Templates" },
];

function ResourceCard({
  resource,
  onDownload,
  viewMode,
}: {
  resource: Resource;
  onDownload: () => void;
  viewMode: "grid" | "list";
}) {
  const TypeIcon = typeIcons[resource.type] || typeIcons.default;
  const CategoryIcon = categoryIcons[resource.category] || categoryIcons.default;

  if (viewMode === "list") {
    return (
      <div
        className="flex items-center gap-4 rounded-lg border bg-card p-4 hover-elevate"
        data-testid={`resource-card-${resource.id}`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{resource.title}</h4>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="capitalize">{resource.type}</span>
            <span className="capitalize">{resource.category}</span>
            <span>{resource.downloadCount || 0} downloads</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="overflow-visible hover-elevate" data-testid={`resource-card-${resource.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <TypeIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {resource.type}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {resource.category}
              </Badge>
            </div>
            <h4 className="mt-2 font-display font-semibold">{resource.title}</h4>
            {resource.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {resource.description}
              </p>
            )}
          </div>
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {resource.tags.slice(0, 4).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {resource.downloadCount || 0} downloads
          </span>
          <Button onClick={onDownload} data-testid={`button-download-${resource.id}`}>
            {resource.type === "article" ? (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResourcesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const downloadMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      await apiRequest("POST", `/api/resources/${resourceId}/download`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
  });

  const handleDownload = (resource: Resource) => {
    downloadMutation.mutate(resource.id);
    if (resource.url) {
      window.open(resource.url, "_blank");
    }
    toast({
      title: "Download started",
      description: `${resource.title} is being downloaded`,
    });
  };

  const filteredResources = resources?.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      activeCategory === "all" || resource.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const resourceStats = {
    total: resources?.length || 0,
    pdfs: resources?.filter((r) => r.type === "pdf").length || 0,
    videos: resources?.filter((r) => r.type === "video").length || 0,
    articles: resources?.filter((r) => r.type === "article").length || 0,
  };

  return (
    <Layout title="Resource Library">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Resource Library</h2>
            <p className="text-muted-foreground">
              Study materials, templates, and learning resources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{resourceStats.total} Resources</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search resources, topics, or tags..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-resources"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto gap-1">
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                data-testid={`tab-category-${category.id}`}
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {[...Array(6)].map((_, i) =>
              viewMode === "grid" ? (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              )
            )}
          </div>
        ) : filteredResources && filteredResources.length > 0 ? (
          <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDownload={() => handleDownload(resource)}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">No resources found</h3>
              <p className="mt-2 text-muted-foreground max-w-sm">
                {searchQuery
                  ? "Try adjusting your search terms or category filter"
                  : "Resources will appear here as they are added"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
