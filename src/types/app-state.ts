export interface AppState {
  version: number;

  theme: {
    mode: "light" | "dark";
    primaryColor?: string;
  };

  entities: Record<string, any>;
  pages: any[];
  navigation: any[];

  // This will evolve over sprints
}
