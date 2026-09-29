pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        // NOTE: do NOT set NODE_ENV=production globally — npm ci skips
        // devDependencies (including vite) when it is set, which breaks
        // the build. Production mode is set only for the Build step.
        // Local deploy target (served / proxied to this path)





        DEPLOY_PATH = "/home/dejassha/Projects/jenkins-office/sakthi-erp"

        // Frontend .env Jenkins credential (backend uses "ecommerce-backend")
        ENV_CREDENTIAL_ID = "sakthi-erp-frontend"
    }

    stages {

        stage('Checkout') {
            steps {
                cleanWs()
                checkout scm
            }
        }

        stage('Setup Node') {
            steps {
                script {
                    // Jenkins agents (e.g. jenkins/jenkins:lts Docker) often
                    // have no Node.js. Install Node 22 locally in the
                    // workspace when missing so later stages can use it.
                    // Persists via env.PATH for all subsequent stages.
                    sh '''
                        set -e
                        if command -v node >/dev/null 2>&1; then
                            echo "Node already available:"
                            node --version
                            npm --version
                            exit 0
                        fi
                        echo "Node not found. Installing Node 22 locally..."
                        NODE_VERSION="22.22.1"
                        NODE_DIR="$WORKSPACE/.tools/node"
                        # npm's shebang is `#!/usr/bin/env node`, so node must
                        # be on PATH in THIS shell before calling npm.
                        export PATH="$NODE_DIR/bin:$PATH"
                        mkdir -p "$WORKSPACE/.tools"
                        if [ ! -x "$NODE_DIR/bin/node" ]; then
                            cd "$WORKSPACE/.tools"
                            rm -rf node "node-v${NODE_VERSION}-linux-x64" "node-v${NODE_VERSION}-linux-x64.tar.gz"
                            if command -v curl >/dev/null 2>&1; then
                                curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz"
                            elif command -v wget >/dev/null 2>&1; then
                                wget -q "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz"
                            else
                                echo "ERROR: neither curl nor wget is available to download Node."
                                exit 1
                            fi
                            tar -xzf "node-v${NODE_VERSION}-linux-x64.tar.gz"
                            mv "node-v${NODE_VERSION}-linux-x64" node
                            rm -f "node-v${NODE_VERSION}-linux-x64.tar.gz"
                        fi
                        node --version
                        npm --version
                    '''
                    env.PATH = "${env.WORKSPACE}/.tools/node/bin:${env.PATH}"
                    echo "Node on PATH: ${env.WORKSPACE}/.tools/node/bin"
                    sh 'node --version; npm --version'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    // Optional .env from Jenkins credentials.
                    // Does not fail the build if the credential is missing —
                    // falls back to the .env committed in the repo.
                    try {
                        withCredentials([
                            file(
                                credentialsId: "${ENV_CREDENTIAL_ID}",
                                variable: 'ENV_FILE'
                            )
                        ]) {
                            sh '''
                                set -e
                                if [ -f "$ENV_FILE" ]; then
                                    echo "Copying Jenkins environment file..."
                                    cp "$ENV_FILE" .env
                                fi
                            '''
                        }
                    } catch (err) {
                        echo "WARNING: credential '${ENV_CREDENTIAL_ID}' not found. Using repo .env as fallback."
                    }

                    sh '''
                        set -e

                        echo "Node version:"
                        node --version
                        echo "npm version:"
                        npm --version

                        echo "Installing dependencies (including devDependencies for build)..."
                        if [ -f "package-lock.json" ]; then
                            # Repo uses npm (package-lock.json exists, no pnpm-lock.yaml).
                            # --include=dev guards against NODE_ENV=production
                            # being set globally on the Jenkins controller.
                            npm ci --include=dev
                        else
                            npm install --include=dev
                        fi

                        echo "Dependencies installed successfully."
                    '''
                }
            }
        }

        stage('Lint') {
            steps {
                sh '''
                    set -e

                    echo "Checking for lint script..."
                    if node -e "process.exit(require('./package.json').scripts && require('./package.json').scripts.lint ? 0 : 1)"; then
                        echo "Running lint..."
                        npm run lint
                        echo "Lint passed."
                    else
                        echo "No lint script defined in package.json. Skipping."
                    fi
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    set -e

                    echo "Building production application..."

                    NODE_ENV=production npm run build

                    if [ ! -d "dist" ]; then
                        echo "ERROR: dist directory was not generated."
                        exit 1
                    fi

                    if [ ! -f "dist/index.html" ]; then
                        echo "ERROR: dist/index.html was not generated."
                        exit 1
                    fi

                    echo ""
                    echo "Build completed successfully."
                    echo ""
                    echo "Build output:"
                    ls -lh dist

                    echo ""
                    echo "Build size:"
                    du -sh dist
                '''
                // Keep a copy of the build on the Jenkins controller so
                // dist/ is retrievable even if the deploy target is down.
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -e

                    echo "Preparing deployment..."

                    if [ ! -d "dist" ]; then
                        echo "ERROR: Build folder not found. Aborting."
                        exit 1
                    fi

                    mkdir -p "${DEPLOY_PATH}"

                    echo "Deploying to:"
                    echo "${DEPLOY_PATH}"
                    echo "NOTE: this path is inside the Jenkins container"
                    echo "unless it is mounted to the host."

                    echo "Synchronizing files..."

                    if command -v rsync >/dev/null 2>&1; then
                        echo "Using:"
                        rsync --version | head -1
                        rsync -av --delete dist/ "${DEPLOY_PATH}/"
                    else
                        echo "WARNING: rsync not found, falling back to cp."
                        mkdir -p "${DEPLOY_PATH}"
                        # rm old files to mimic --delete, then copy
                        rm -rf "${DEPLOY_PATH:?}/"*
                        cp -a dist/. "${DEPLOY_PATH}/"
                    fi

                    echo "Deployment completed successfully."
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    echo "Verifying deployment..."

                    if [ ! -f "${DEPLOY_PATH}/index.html" ]; then
                        echo "ERROR: index.html was not found after deployment."
                        exit 1
                    fi

                    echo "index.html found."

                    echo ""
                    echo "Deployed files:"
                    ls -lh "${DEPLOY_PATH}" | head -20

                    echo ""
                    echo "Deployment size:"
                    du -sh "${DEPLOY_PATH}"

                    echo ""
                    echo "Deployment verification successful."
                '''
            }
        }
    }

    post {
        success {
            echo "=============================================="
            echo "Production deployment successful."
            echo "Build: #${BUILD_NUMBER}"
            echo "Path: ${DEPLOY_PATH}"
            echo "=============================================="
        }

        failure {
            echo "=============================================="
            echo "Production deployment FAILED."
            echo "Build: #${BUILD_NUMBER}"
            echo "Check the Jenkins console output."
            echo "=============================================="
        }

        always {
            cleanWs()
        }
    }
}
