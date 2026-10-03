package com.moneymonitor.service;

import com.moneymonitor.domain.Category;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.CategoryDto;
import com.moneymonitor.dto.FinanceDtos.CategoryRequest;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.repository.BudgetRepository;
import com.moneymonitor.repository.CategoryRepository;
import com.moneymonitor.repository.ExpenseRepository;
import com.moneymonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final RealtimeService realtime;

    @Transactional(readOnly = true)
    public List<CategoryDto> list(Long userId) {
        return categoryRepository.findVisibleTo(userId).stream().map(CategoryDto::from).toList();
    }

    /** Returns a category the user is allowed to use (a global default or one of their own). */
    @Transactional(readOnly = true)
    public Category getUsable(Long userId, Long categoryId) {
        Category c = categoryRepository.findById(categoryId).orElseThrow(() -> ApiException.notFound("Category"));
        if (c.getOwner() != null && !c.getOwner().getId().equals(userId)) {
            throw ApiException.notFound("Category");
        }
        return c;
    }

    @Transactional
    public CategoryDto create(Long userId, CategoryRequest req) {
        User owner = userRepository.getReferenceById(userId);
        boolean duplicate = categoryRepository.findVisibleTo(userId).stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(req.name().trim()));
        if (duplicate) {
            throw new ApiException(HttpStatus.CONFLICT, "A category with this name already exists");
        }
        Category c = categoryRepository.save(Category.builder()
                .name(req.name().trim())
                .icon(req.icon() == null || req.icon().isBlank() ? "🏷️" : req.icon())
                .color(req.color() == null ? "#64748b" : req.color())
                .essential(req.essential())
                .owner(owner)
                .build());
        notifyChange(userId);
        return CategoryDto.from(c);
    }

    @Transactional
    public CategoryDto update(Long userId, Long id, CategoryRequest req) {
        Category c = getOwned(userId, id);
        c.setName(req.name().trim());
        if (req.icon() != null && !req.icon().isBlank()) c.setIcon(req.icon());
        if (req.color() != null) c.setColor(req.color());
        c.setEssential(req.essential());
        notifyChange(userId);
        return CategoryDto.from(c);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Category c = getOwned(userId, id);
        if (expenseRepository.existsByCategoryId(id) || budgetRepository.existsByCategoryId(id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This category is used by expenses or budgets. Move or delete them first.");
        }
        categoryRepository.delete(c);
        notifyChange(userId);
    }

    private Category getOwned(Long userId, Long id) {
        Category c = categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        if (c.getOwner() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Default categories can't be modified");
        }
        if (!c.getOwner().getId().equals(userId)) {
            throw ApiException.notFound("Category");
        }
        return c;
    }

    private void notifyChange(Long userId) {
        userRepository.findById(userId).ifPresent(u ->
                realtime.toUser(u.getEmail(), RealtimeService.EventType.CATEGORIES_CHANGED, null));
    }
}
