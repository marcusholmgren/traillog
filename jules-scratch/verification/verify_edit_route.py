from playwright.sync_api import Page, expect
import re

def test_edit_route_name(page: Page):
    """
    This test verifies that a user can create a route and then edit its name.
    """
    # 1. Arrange: Go to the create route page and create a new route.
    page.goto("http://localhost:5174/routes/create")

    # Click on the map to create a route
    page.locator("#map").click(position={"x": 100, "y": 100})
    page.locator("#map").click(position={"x": 200, "y": 200})

    # Save the route
    page.get_by_role("button", name="Save").click()

    # Go to the saved routes page
    page.goto("http://localhost:5174/routes")

    # 2. Act: Find the edit button for the first route and click it.
    edit_button = page.get_by_role("link", name=re.compile("Edit route")).first
    edit_button.click()

    # 3. Assert: Check that we are on the edit route page.
    expect(page).to_have_url(re.compile(r"\/routes\/edit\/\d+"))
    expect(page.get_by_role("heading", name="Edit Route")).to_be_visible()

    # 4. Act: Change the name of the route.
    name_input = page.get_by_label("Name")
    name_input.fill("New Route Name")

    # 5. Act: Click the save button.
    save_button = page.get_by_role("button", name="Save Changes")
    save_button.click()

    # 6. Assert: Check that we are back on the saved routes page
    # and the route name has been updated.
    expect(page.get_by_role("heading", name="Saved Routes")).to_be_visible()
    expect(page.get_by_text("New Route Name")).to_be_visible()

    # 7. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
