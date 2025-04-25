package org.biterunr_studios.biterunr.ReusableFunctions

import org.biterunr_studios.biterunr.Models.ErrorResponse
import org.biterunr_studios.biterunr.Models.PathElement

fun mapValidationErrors(
    errorResponse: ErrorResponse,
    handlers: Map<String, (String) -> Unit>
) {
    for (issue in errorResponse.error.issues) {
        val pathKey = issue.path.joinToString(".") { pathElement ->
            when (pathElement) {
                is PathElement.StringElement -> pathElement.value
                is PathElement.NumberElement -> "[${pathElement.value}]"
            }
        }

        val exactHandler = handlers[pathKey]
        if (exactHandler != null) {
            exactHandler(issue.message)
            continue
        }

        val simplifiedPath = pathKey.replace(Regex("""\[\d+]"""), "")
        val simplifiedHandler = handlers[simplifiedPath]
        if (simplifiedHandler != null) {
            simplifiedHandler(issue.message)
        }
    }
}
