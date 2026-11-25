from pathlib import Path
import os
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait


workspace = Path(__file__).resolve().parents[2]
frontend = workspace / "frontend" / "index.html"
screenshots = Path(os.environ["TEMP"]) / "labar_frontend_qa"
screenshots.mkdir(parents=True, exist_ok=True)

options = Options()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--hide-scrollbars")
options.add_experimental_option(
    "mobileEmulation",
    {
        "deviceMetrics": {"width": 390, "height": 844, "pixelRatio": 1},
        "userAgent": (
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 "
            "Chrome/124.0 Mobile Safari/537.36"
        ),
    },
)

driver = webdriver.Edge(options=options)
wait = WebDriverWait(driver, 8)


def visible_screen(name: str):
    return wait.until(
        lambda browser: browser.find_element(By.CSS_SELECTOR, f'[data-screen="{name}"]')
        if browser.find_element(By.CSS_SELECTOR, f'[data-screen="{name}"]').is_displayed()
        else False
    )


try:
    driver.get(frontend.as_uri())
    assert visible_screen("home")
    assert driver.execute_script("return document.documentElement.scrollWidth") <= 390

    driver.find_element(By.CSS_SELECTOR, '[data-go="practice"]').click()
    assert visible_screen("practice")
    assert not driver.find_element(By.ID, "practice-continue").is_enabled()

    driver.find_element(By.ID, "practice-card").click()
    assert driver.find_element(By.ID, "practice-continue").is_enabled()
    driver.find_element(By.ID, "practice-continue").click()

    assert visible_screen("scan")
    driver.find_element(By.ID, "scan-button").click()
    wait.until(lambda browser: browser.find_element(By.ID, "scan-continue").is_enabled())
    assert "Puesto LAB-01" in driver.find_element(By.ID, "scan-result").text
    driver.find_element(By.ID, "scan-continue").click()

    assert visible_screen("confirm")
    driver.find_element(By.ID, "match-no").click()
    assert driver.find_element(By.ID, "mismatch-notice").is_displayed()
    assert not driver.find_element(By.ID, "confirm-continue").is_enabled()
    driver.find_element(By.ID, "match-yes").click()
    assert driver.find_element(By.ID, "confirm-continue").is_enabled()
    driver.find_element(By.ID, "confirm-continue").click()

    assert visible_screen("checklist")
    checklist_button = driver.find_element(By.ID, "checklist-continue")
    assert not checklist_button.is_enabled()
    checkboxes = driver.find_elements(By.CSS_SELECTOR, "#safety-checklist input")
    for checkbox in checkboxes:
        driver.execute_script("arguments[0].click()", checkbox)
    assert checklist_button.is_enabled()
    checklist_button.click()

    assert visible_screen("guide")
    driver.save_screenshot(str(screenshots / "guide_ar.png"))
    driver.find_element(By.ID, "simulate-loss").click()
    assert visible_screen("lost")
    assert "No cambies conexiones" in driver.find_element(By.CSS_SELECTOR, ".screen--lost").text
    driver.find_element(By.ID, "lost-use-2d").click()

    assert visible_screen("guide")
    assert "Guía 2D" in driver.find_element(By.ID, "simulation-label").text
    driver.save_screenshot(str(screenshots / "guide_2d.png"))

    for _ in range(5):
        driver.find_element(By.ID, "guide-next").click()

    assert visible_screen("quiz")
    for question in ("q1", "q2", "q3"):
        driver.find_element(By.CSS_SELECTOR, f'input[name="{question}"][value="b"]').click()
    driver.find_element(By.CSS_SELECTOR, '#quiz-form button[type="submit"]').click()

    wait.until(lambda browser: browser.find_element(By.ID, "quiz-result").is_displayed())
    assert "3 de 3" in driver.find_element(By.ID, "result-score").text
    driver.save_screenshot(str(screenshots / "result.png"))

    assert driver.execute_script("return document.documentElement.scrollWidth") <= 390
    print("PASS: flujo completo, bloqueo preventivo, falla segura, modo 2D y evaluación")
    print(f"viewport={driver.execute_script('return window.innerWidth')}x{driver.execute_script('return window.innerHeight')}")
    print(f"screenshots={screenshots}")
finally:
    driver.quit()
