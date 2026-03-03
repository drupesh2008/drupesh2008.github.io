export interface SkillCategory {
  name: string;
  color: 'teal' | 'violet' | 'amber';
  skills: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    name: "Languages & Frameworks",
    color: "teal",
    skills: ["Go", "JavaScript", "Python", "C++", "PHP", "C#", "Java", "React", ".NET 8"],
  },
  {
    name: "Databases",
    color: "violet",
    skills: ["MySQL", "PostgreSQL", "Redis", "Azure Cosmos DB"],
  },
  {
    name: "AI/ML Stack",
    color: "amber",
    skills: ["OpenCV", "TensorFlow", "PyTorch", "scikit-learn", "NumPy", "LLM", "Image Processing", "STT", "TTS", "Voice Agents"],
  },
  {
    name: "DevOps & Cloud",
    color: "violet",
    skills: ["AWS", "Azure", "Docker", "Jenkins", "HAProxy", "Grafana"],
  },
  {
    name: "Data & Messaging",
    color: "violet",
    skills: ["Apache Kafka", "RabbitMQ", "ElasticSearch", "Apache Spark", "Azure Search AI", "Databricks"],
  },
  {
    name: "Geospatial Stack",
    color: "teal",
    skills: ["Leaflet", "OpenLayers", "Mapbox", "GDAL", "H3", "GeoPandas", "GeoParquet", "Nominatim", "OSM", "Libpostal"],
  },
  {
    name: "IoT & Hardware",
    color: "amber",
    skills: ["Arduino", "NVIDIA Jetson", "ESP32", "Raspberry Pi"],
  },
];
