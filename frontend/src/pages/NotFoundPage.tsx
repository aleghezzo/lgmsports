import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-sm text-muted-foreground">
          La página que buscás no existe.
        </p>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
