import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => {
    return (
        <div className="space-y-6 m-5">
            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                        <CardHeader className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24 bg-chart-1" />
                                <Skeleton className="size-10 rounded-lg bg-chart-1" />
                            </div>

                            <Skeleton className="h-8 w-20 bg-chart-1" />
                            <Skeleton className="h-3 w-28 bg-chart-1" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
            
            {/* Bottom Section */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Large Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader className="space-y-3">
                        <Skeleton className="h-5 w-40 bg-chart-1" />
                        <Skeleton className="h-4 w-32 bg-chart-1" />
                    </CardHeader>

                    <CardContent>
                        <Skeleton className="h-96 w-full rounded-lg bg-chart-1" />
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                    <CardHeader className="space-y-3">
                        <Skeleton className="h-5 w-32 bg-chart-1" />
                        <Skeleton className="h-4 w-24 bg-chart-1" />
                    </CardHeader>

                    <CardContent className="flex flex-col items-center gap-6">
                        <Skeleton className="size-56 rounded-full bg-chart-1" />

                        <div className="w-full space-y-3">
                            <Skeleton className="h-4 w-full bg-chart-1" />
                            <Skeleton className="h-4 w-5/6 bg-chart-1" />
                            <Skeleton className="h-4 w-4/6 bg-chart-1" />
                            <Skeleton className="h-4 w-3/4 bg-chart-1" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardSkeleton;