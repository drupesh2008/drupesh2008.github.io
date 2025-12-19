'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/animations/variants'
import styles from './Skills.module.css'

const Skills = () => {
  const skillCategories = [
    {
      title: "Languages & Frameworks",
      skills: [
        { name: "Go", badge: "https://img.shields.io/badge/-Go-00ADD8?style=flat-square&logo=go&logoColor=white" },
        { name: "JavaScript", badge: "https://img.shields.io/badge/-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" },
        { name: "Python", badge: "https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white" },
        { name: "C++", badge: "https://img.shields.io/badge/-C++-00599C?style=flat-square&logo=c%2B%2B&logoColor=white" },
        { name: "PHP", badge: "https://img.shields.io/badge/-PHP-777BB4?style=flat-square&logo=php&logoColor=white" },
        { name: "C#", badge: "https://img.shields.io/badge/-C%23-239120?style=flat-square&logo=c-sharp&logoColor=white" },
        { name: "Java", badge: "https://img.shields.io/badge/-Java-007396?style=flat-square&logo=openjdk&logoColor=white" },
        { name: "React", badge: "https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black" },
        { name: ".NET 8", badge: "https://img.shields.io/badge/-.NET%208-512BD4?style=flat-square&logo=dotnet&logoColor=white" }
      ]
    },
    {
      title: "Databases",
      skills: [
        { name: "MySQL", badge: "https://img.shields.io/badge/-MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white" },
        { name: "PostgreSQL", badge: "https://img.shields.io/badge/-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white" },
        { name: "Redis", badge: "https://img.shields.io/badge/-Redis-DC382D?style=flat-square&logo=redis&logoColor=white" },
        { name: "Azure Cosmos DB", badge: "https://img.shields.io/badge/-Azure%20Cosmos%20DB-0078D4?style=flat-square&logo=azure-cosmos-db&logoColor=white" }
      ]
    },
    {
      title: "AI/ML Stack",
      skills: [
        { name: "OpenCV", badge: "https://img.shields.io/badge/-OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white" },
        { name: "TensorFlow", badge: "https://img.shields.io/badge/-TensorFlow-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" },
        { name: "PyTorch", badge: "https://img.shields.io/badge/-PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white" },
        { name: "scikit-learn", badge: "https://img.shields.io/badge/-scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" },
        { name: "NumPy", badge: "https://img.shields.io/badge/-NumPy-013243?style=flat-square&logo=numpy&logoColor=white" },
        { name: "LLM", badge: "https://img.shields.io/badge/-LLM-412991?style=flat-square&logo=openai&logoColor=white" },
        { name: "Image Processing", badge: "https://img.shields.io/badge/-Image%20Processing-4285F4?style=flat-square&logo=google-cloud&logoColor=white" },
        { name: "Speech-to-Text", badge: "https://img.shields.io/badge/-Speech--to--Text-4285F4?style=flat-square&logo=google-cloud&logoColor=white" },
        { name: "Text-to-Speech", badge: "https://img.shields.io/badge/-Text--to--Speech-4285F4?style=flat-square&logo=google-cloud&logoColor=white" },
        { name: "Voice Agents", badge: "https://img.shields.io/badge/-Voice%20Agents-61DAFB?style=flat-square&logo=react&logoColor=black" }
      ]
    },
    {
      title: "DevOps & Cloud",
      skills: [
        { name: "AWS", badge: "https://img.shields.io/badge/-AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white" },
        { name: "Docker", badge: "https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white" },
        { name: "Jenkins", badge: "https://img.shields.io/badge/-Jenkins-D24939?style=flat-square&logo=jenkins&logoColor=white" },
        { name: "HAProxy", badge: "https://img.shields.io/badge/-HAProxy-1A1918?style=flat-square&logo=haproxy&logoColor=white" },
        { name: "Grafana", badge: "https://img.shields.io/badge/-Grafana-F46800?style=flat-square&logo=grafana&logoColor=white" },
        { name: "Azure", badge: "https://img.shields.io/badge/-Azure-0089D6?style=flat-square&logo=microsoft-azure&logoColor=white" }
      ]
    },
    {
      title: "Data & Messaging",
      skills: [
        { name: "Apache Kafka", badge: "https://img.shields.io/badge/-Apache%20Kafka-231F20?style=flat-square&logo=apache-kafka&logoColor=white" },
        { name: "RabbitMQ", badge: "https://img.shields.io/badge/-RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" },
        { name: "Machine Learning", badge: "https://img.shields.io/badge/-Machine%20Learning-01D277?style=flat-square&logo=python&logoColor=white" },
        { name: "ElasticSearch", badge: "https://img.shields.io/badge/-ElasticSearch-005571?style=flat-square&logo=elasticsearch&logoColor=white" },
        { name: "Apache Spark", badge: "https://img.shields.io/badge/-Apache%20Spark-E25A1C?style=flat-square&logo=apache-spark&logoColor=white" },
        { name: "Azure Search AI", badge: "https://img.shields.io/badge/-Azure%20Search%20AI-0089D6?style=flat-square&logo=microsoft-azure&logoColor=white" },
        { name: "Databricks", badge: "https://img.shields.io/badge/-Databricks-FF3621?style=flat-square&logo=databricks&logoColor=white" }
      ]
    },
    {
      title: "Geospatial Stack",
      skills: [
        { name: "Leaflet", badge: "https://img.shields.io/badge/-Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white" },
        { name: "OpenLayers", badge: "https://img.shields.io/badge/-OpenLayers-1F6B75?style=flat-square&logo=openlayers&logoColor=white" },
        { name: "Mapbox", badge: "https://img.shields.io/badge/-Mapbox-000000?style=flat-square&logo=mapbox&logoColor=white" },
        { name: "GDAL", badge: "https://img.shields.io/badge/-GDAL-5CAE58?style=flat-square&logo=gdal&logoColor=white" },
        { name: "H3", badge: "https://img.shields.io/badge/-H3-2C3E50?style=flat-square&logo=uber&logoColor=white" },
        { name: "GeoPandas", badge: "https://img.shields.io/badge/-GeoPandas-306998?style=flat-square&logo=pandas&logoColor=white" },
        { name: "GeoParquet", badge: "https://img.shields.io/badge/-GeoParquet-4B32C3?style=flat-square&logo=apache-parquet&logoColor=white" },
        { name: "Nominatim", badge: "https://img.shields.io/badge/-Nominatim-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white" },
        { name: "OpenStreetMap", badge: "https://img.shields.io/badge/-OpenStreetMap-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white" },
        { name: "Libpostal", badge: "https://img.shields.io/badge/-Libpostal-FF6B6B?style=flat-square&logo=location&logoColor=white" }
      ]
    },
    {
      title: "IoT & Hardware",
      skills: [
        { name: "IoT", badge: "https://img.shields.io/badge/-IoT-00979D?style=flat-square&logo=internetofthings&logoColor=white" },
        { name: "Arduino", badge: "https://img.shields.io/badge/-Arduino-00979D?style=flat-square&logo=arduino&logoColor=white" },
        { name: "NVIDIA Jetson", badge: "https://img.shields.io/badge/-NVIDIA%20Jetson-76B900?style=flat-square&logo=nvidia&logoColor=white" },
        { name: "ESP32", badge: "https://img.shields.io/badge/-ESP32-E7352C?style=flat-square&logo=espressif&logoColor=white" }
      ]
    }
  ]

  return (
    <motion.div 
      className={styles.skillsSection} 
      id="skills" 
      variants={fadeInUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.2 }}
    >
      <h3 className={styles.sectionTitle}>Skills & Technologies</h3>
      <div className={styles.skillsGrid}>
        {skillCategories.map((category) => (
          <div key={category.title} className={styles.skillCategory}>
            <h4 className={styles.categoryTitle}>{category.title}</h4>
            <div className={styles.skillBadges}>
              {category.skills.map((skill) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  key={skill.name}
                  src={skill.badge}
                  alt={skill.name}
                  className={styles.skillBadge}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default Skills 