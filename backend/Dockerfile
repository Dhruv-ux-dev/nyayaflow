# Build the jar with Maven, then run it on a slim JRE as a non-root user.
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --uid 1001 nyayaflow \
    && mkdir -p /data/uploads \
    && chown nyayaflow /data/uploads
COPY --from=build /app/target/nyayaflow.jar app.jar
USER nyayaflow
ENV NYAYAFLOW_STORAGE_LOCATION=/data/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
