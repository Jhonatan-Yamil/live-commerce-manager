FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY public ./public
COPY src ./src

ARG REACT_APP_API_URL=http://localhost:8000/api
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html

# Inline minimal nginx config for React SPA routing
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
	listen 80;
	server_name _;
	root /usr/share/nginx/html;
	index index.html;

	location / {
		try_files $uri $uri/ /index.html;
	}
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]