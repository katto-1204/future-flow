import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Filter,
  GraduationCap,
  Briefcase,
  Calendar,
} from "lucide-react";
import type { Opportunity, SavedOpportunity } from "@shared/schema";

function OpportunityCard({
  opportunity,
  isSaved,
  onToggleSave,
}: {
  opportunity: Opportunity;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const isInternship = opportunity.type === "internship";

  return (
    <Card className="overflow-visible" data-testid={`opportunity-card-${opportunity.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isInternship ? "bg-primary/10" : "bg-secondary"
            }`}>
              {isInternship ? (
                <GraduationCap className="h-6 w-6 text-primary" />
              ) : (
                <Briefcase className="h-6 w-6 text-secondary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold">{opportunity.title}</h3>
                <Badge variant={isInternship ? "default" : "secondary"}>
                  {opportunity.type}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {opportunity.company}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSave}
            data-testid={`button-save-${opportunity.id}`}
          >
            {isSaved ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
          {opportunity.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {opportunity.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {opportunity.location}
            </span>
          )}
          {opportunity.industry && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {opportunity.industry}
            </span>
          )}
          {opportunity.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(opportunity.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {opportunity.requiredSkills.slice(0, 5).map((skill, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {opportunity.requiredSkills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{opportunity.requiredSkills.length - 5}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          {opportunity.applicationUrl && (
            <Button asChild>
              <a
                href={opportunity.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`button-apply-${opportunity.id}`}
              >
                Apply Now
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpportunitiesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: opportunities, isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: savedOpportunities } = useQuery<SavedOpportunity[]>({
    queryKey: ["/api/opportunities", "saved"],
  });

  const savedIds = new Set(savedOpportunities?.map((s) => s.opportunityId) || []);

  const toggleSaveMutation = useMutation({
    mutationFn: async ({ opportunityId, isSaved }: { opportunityId: string; isSaved: boolean }) => {
      if (isSaved) {
        await apiRequest("DELETE", `/api/opportunities/${opportunityId}/save`);
      } else {
        await apiRequest("POST", `/api/opportunities/${opportunityId}/save`);
      }
    },
    onSuccess: (_, { isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", "saved"] });
      toast({
        title: isSaved ? "Removed from saved" : "Saved successfully",
        description: isSaved ? "Opportunity removed from your bookmarks" : "Opportunity added to your bookmarks",
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const locations = [...new Set(opportunities?.map((o) => o.location).filter(Boolean) || [])];

  const filteredOpportunities = opportunities?.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || opp.type === filterType;
    const matchesLocation = !filterLocation || opp.location === filterLocation;

    if (activeTab === "saved") {
      return matchesSearch && matchesType && matchesLocation && savedIds.has(opp.id);
    }

    return matchesSearch && matchesType && matchesLocation;
  });

  const internshipCount = opportunities?.filter((o) => o.type === "internship").length || 0;
  const jobCount = opportunities?.filter((o) => o.type === "job").length || 0;

  return (
    <Layout title="Opportunities">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Opportunities</h2>
            <p className="text-muted-foreground">
              Discover internships and job opportunities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              {internshipCount} Internships
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Briefcase className="h-3 w-3" />
              {jobCount} Jobs
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-opportunities"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="job">Job</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[160px]" data-testid="select-filter-location">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc!}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-opportunities">
              All Opportunities
            </TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved-opportunities">
              <Bookmark className="mr-1.5 h-4 w-4" />
              Saved ({savedIds.size})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOpportunities && filteredOpportunities.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                isSaved={savedIds.has(opportunity.id)}
                onToggleSave={() =>
                  toggleSaveMutation.mutate({
                    opportunityId: opportunity.id,
                    isSaved: savedIds.has(opportunity.id),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                {activeTab === "saved" ? (
                  <Bookmark className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {activeTab === "saved" ? "No saved opportunities" : "No opportunities found"}
              </h3>
              <p className="mt-2 text-muted-foreground max-w-sm">
                {activeTab === "saved"
                  ? "Save opportunities by clicking the bookmark icon"
                  : searchQuery
                  ? "Try adjusting your search or filters"
                  : "New opportunities will appear here as they are posted"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
