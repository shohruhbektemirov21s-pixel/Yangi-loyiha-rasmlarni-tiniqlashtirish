from locust import HttpUser, task, between
import os
import random
import string

class CompressAPIUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Setup actions, e.g. login to get token if required
        # For now, we assume public access or we bypass auth
        self.headers = {"Authorization": "Bearer TEST_TOKEN"}

    @task(3)
    def compress_image(self):
        # Create a small dummy payload
        dummy_content = b"fake image content " * 100
        files = {"file": ("test.jpg", dummy_content, "image/jpeg")}
        
        with self.client.post("/api/v1/compress", files=files, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 202, 401]: # 401 acceptable if auth not mocked during stress test
                response.success()
            else:
                response.failure(f"Failed to compress: {response.status_code}")

    @task(1)
    def check_job_status(self):
        job_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=32))
        with self.client.get(f"/api/v1/compress/jobs/{job_id}", headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 404, 401]: # 404 expected since random job_id
                response.success()
            else:
                response.failure(f"Failed job check: {response.status_code}")
